/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Web3Provider } from '@ethersproject/providers';
import { useCallback, useEffect, useRef } from 'react';
import Web3Modal, { ICoreOptions, ThemeColors } from 'web3modal';
import './helpers/_global';

import { TEthersProvider } from '~~/models';

export interface IWeb3ModalState {
  initializing: boolean;
  openWeb3ModalCallback: () => void;
  logoutOfWeb3ModalCallback: () => void;
  updateWeb3ModalThemeCallback: (theme: ThemeColors | string) => void;
}

const const_web3DialogClosedByUser = 'Modal closed by user';

/**
 * A hook that makes it easy to use web3Modal
 * @param web3ModalConfig
 * @param setCurrentEthersProvider
 * @returns
 */
export const useWeb3Modal = (
  web3ModalConfig: Partial<ICoreOptions>,
  setCurrentEthersProvider: (newEthersProvider: TEthersProvider | undefined) => void
): IWeb3ModalState => {
  const web3ModalProviderRef = useRef<Web3Modal>();
  const initalizingRef = useRef<boolean>();

  /**
   * initalize web3 object and save it to state
   */
  useEffect(() => {
    if (!Web3Modal) {
      throw 'Web3Modal is a peer dependancy to use this hook';
    }
    web3ModalProviderRef.current = new Web3Modal(web3ModalConfig ?? {});
    initalizingRef.current = true;
    setCurrentEthersProvider(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [web3ModalConfig]);

  /**
   * a callback to reload the page and clear cache
   */
  const reloadPage = useCallback(() => {
    return (_param: any): void => {
      web3ModalProviderRef.current?.cachedProvider &&
        setTimeout(() => {
          window.location.reload();
        }, 1);
    };
  }, []);

  /**
   * log out of web3modal provider
   */
  const logoutOfWeb3ModalCallback = useCallback(
    (reload: boolean = false): void => {
      initalizingRef.current = false;
      setCurrentEthersProvider(undefined);
      if (reload) {
        reloadPage();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setCurrentEthersProvider]
  );

  /**
   * the function that setups up and loads the web3modal
   */
  const loadWeb3Modal = useCallback(async () => {
    try {
      initalizingRef.current = true;
      const provider = await web3ModalProviderRef.current?.connect();
      setCurrentEthersProvider(new Web3Provider(provider));

      if (provider?.on) {
        provider.on('chainChanged', (chainId: number) => {
          console.log(`chain changed to ${chainId}! updating providers`);
          setCurrentEthersProvider(new Web3Provider(provider));
        });

        provider.on('accountsChanged', () => {
          console.log(`account changed!`);
          setCurrentEthersProvider(new Web3Provider(provider));
        });

        // Subscribe to session disconnection
        provider.on('disconnect', (code: any, reason: any) => {
          console.log(code, reason);
          void logoutOfWeb3ModalCallback();
          setCurrentEthersProvider(undefined);
        });
      }
    } catch (e) {
      if ((e as string).includes(const_web3DialogClosedByUser)) {
        console.log(e);
      } else {
        throw e;
      }
    } finally {
      initalizingRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setCurrentEthersProvider]);

  /**
   * On initalization, load modal
   */
  useEffect(() => {
    if (web3ModalProviderRef.current?.cachedProvider) {
      void loadWeb3Modal();
    }
  }, [loadWeb3Modal]);

  /**
   * a callback to open the modal
   */
  const openWeb3ModalCallback = useCallback(() => {
    setCurrentEthersProvider(undefined);
    web3ModalProviderRef.current?.clearCachedProvider();
    void loadWeb3Modal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadWeb3Modal]);

  const updateWeb3ModalThemeCallback = useCallback((theme: ThemeColors | string) => {
    web3ModalProviderRef.current?.updateTheme(theme);
  }, []);

  /**
   * add hooks to reload page if required
   */
  useEffect(() => {
    /* eslint-disable */
    if (window?.ethereum?.on && window?.ethereum?.off) {
      window.ethereum.on('chainChanged', reloadPage);
      window.ethereum.on('accountsChanged', reloadPage);
      return () => {
        window.ethereum.off('chainChanged', reloadPage);
        window.ethereum.off('accountsChanged', reloadPage);
      };
    }
    /* eslint-disable */
  }, [window?.ethereum]);

  return {
    initializing: initalizingRef.current ?? false,
    openWeb3ModalCallback,
    logoutOfWeb3ModalCallback,
    updateWeb3ModalThemeCallback,
  };
};
